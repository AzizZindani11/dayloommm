-- ============================================================================
-- DAYLOOM — SUPABASE DATABASE SCHEMA, RLS POLICIES & RPC FUNCTIONS
-- ============================================================================
-- Skema lengkap untuk multi-device cloud synchronization, autentikasi,
-- isolasi data per akun petualang, dan buku besar RP anti-duplikasi.
-- ============================================================================

-- 1. TABEL PROFIL PETUALANG (PROFILES)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  bio TEXT DEFAULT 'Menenun langkah kecil setiap hari menjadi petualangan bermakna.',
  avatar_url TEXT,
  outfit TEXT DEFAULT 'wanderer',
  hat TEXT DEFAULT 'straw_hat',
  time_of_day TEXT DEFAULT 'pagi',
  selected_character TEXT DEFAULT 'traveler',
  total_rp INTEGER DEFAULT 0 CHECK (total_rp >= 0),
  featured_achievements TEXT[] DEFAULT '{}',
  visited_locations TEXT[] DEFAULT '{quest_board}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_select_own') THEN
    CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_update_own') THEN
    CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_insert_own') THEN
    CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- 2. TABEL MISI (TASKS)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_id TEXT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'pribadi',
  priority TEXT DEFAULT 'sedang',
  deadline DATE,
  status TEXT DEFAULT 'tersedia',
  is_rp_claimed BOOLEAN DEFAULT false,
  completed_on_time BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Indexing untuk query cepat multi-device
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_local ON public.tasks(user_id, local_id);

-- RLS Tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_all_own') THEN
    CREATE POLICY "tasks_all_own" ON public.tasks FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 3. TABEL DAFTAR PERIKSA (TASK_CHECKLISTS)
CREATE TABLE IF NOT EXISTS public.task_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_id TEXT,
  text TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexing Checklist
CREATE INDEX IF NOT EXISTS idx_checklists_task_id ON public.task_checklists(task_id);
CREATE INDEX IF NOT EXISTS idx_checklists_user_id ON public.task_checklists(user_id);

-- RLS Task Checklists
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_checklists' AND policyname = 'task_checklists_all_own') THEN
    CREATE POLICY "task_checklists_all_own" ON public.task_checklists FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 4. BUKU BESAR RP (RP_LEDGER) — CATATAN ATOMIK ANTI-DUPLIKASI
CREATE TABLE IF NOT EXISTS public.rp_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  points INTEGER NOT NULL DEFAULT 10,
  reason TEXT DEFAULT 'Menyelesaikan Misi Harian',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rp_ledger_user ON public.rp_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_rp_ledger_task ON public.rp_ledger(user_id, task_id);

-- RLS RP Ledger
ALTER TABLE public.rp_ledger ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rp_ledger' AND policyname = 'rp_ledger_select_own') THEN
    CREATE POLICY "rp_ledger_select_own" ON public.rp_ledger FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rp_ledger' AND policyname = 'rp_ledger_insert_own') THEN
    CREATE POLICY "rp_ledger_insert_own" ON public.rp_ledger FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 5. RIWAYAT PERINGKAT (RANK_HISTORY) — MILESTONE CROSS-DEVICE
CREATE TABLE IF NOT EXISTS public.rank_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rank_id TEXT NOT NULL,
  rank_name TEXT NOT NULL,
  rp_at_time INTEGER NOT NULL DEFAULT 0,
  reached_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rank_history_user ON public.rank_history(user_id, reached_at);

-- RLS Rank History
ALTER TABLE public.rank_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rank_history' AND policyname = 'rank_history_select_own') THEN
    CREATE POLICY "rank_history_select_own" ON public.rank_history FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rank_history' AND policyname = 'rank_history_insert_own') THEN
    CREATE POLICY "rank_history_insert_own" ON public.rank_history FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 6. TRIGGER OTOMATIS: INISIALISASI PROFIL SAAT USER MENDAFTAR (HANDLE_NEW_USER)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, bio, total_rp, created_at, updated_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'Menenun langkah kecil setiap hari menjadi petualangan bermakna.',
    0,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pasang trigger pada auth.users jika belum ada
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- 7. RPC ATOMIK: CLAIM_TASK_RP (+10 RP HANYA SEKALI, SERVER-AUTHORITATIVE)
CREATE OR REPLACE FUNCTION public.claim_task_rp(
  p_task_id UUID DEFAULT NULL,
  p_local_id TEXT DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_user_id UUID;
  v_task RECORD;
  v_total_rp INT;
  v_incomplete_count INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Pengguna tidak terotentikasi.';
  END IF;

  -- 1. Cari tugas berdasarkan UUID database atau local_id milik pengguna aktif
  SELECT * INTO v_task FROM public.tasks
  WHERE user_id = v_user_id AND (
    (p_task_id IS NOT NULL AND id = p_task_id) OR
    (p_local_id IS NOT NULL AND (local_id = p_local_id OR id::text = p_local_id))
  )
  LIMIT 1;

  IF v_task.id IS NULL THEN
    RAISE EXCEPTION 'Misi tidak ditemukan.';
  END IF;

  -- 2. Anti-duplikasi ketat: jika RP sudah pernah diklaim, tolak penambahan
  IF v_task.is_rp_claimed = true THEN
    SELECT COALESCE(total_rp, 0) INTO v_total_rp FROM public.profiles WHERE id = v_user_id;
    RETURN jsonb_build_object(
      'success', false,
      'already_claimed', true,
      'message', 'RP untuk misi ini sudah pernah diklaim sebelumnya.',
      'total_rp', COALESCE(v_total_rp, 0),
      'awarded_rp', 0
    );
  END IF;

  -- 3. Validasi checklist wajib
  SELECT COUNT(*) INTO v_incomplete_count FROM public.task_checklists
  WHERE task_id = v_task.id AND is_completed = false;

  IF v_incomplete_count > 0 THEN
    RAISE EXCEPTION 'Seluruh butir daftar periksa wajib harus dicentang sebelum menyelesaikan misi!';
  END IF;

  -- 4. Tandai misi selesai dan klaim RP di tabel tasks
  UPDATE public.tasks
  SET status = 'selesai',
      is_rp_claimed = true,
      completed_at = now()
  WHERE id = v_task.id;

  -- 5. Catat ke buku besar rp_ledger
  INSERT INTO public.rp_ledger (user_id, task_id, points, reason)
  VALUES (v_user_id, v_task.id, 10, 'Menyelesaikan Misi: ' || v_task.title);

  -- 6. Tambahkan total_rp pada profil petualang secara atomik (dengan COALESCE agar aman jika total_rp bernilai NULL)
  UPDATE public.profiles
  SET total_rp = COALESCE(total_rp, 0) + 10,
      updated_at = now()
  WHERE id = v_user_id
  RETURNING total_rp INTO v_total_rp;

  RETURN jsonb_build_object(
    'success', true,
    'already_claimed', false,
    'message', 'Misi berhasil diselesaikan! +10 RP dianugerahkan.',
    'new_total_rp', v_total_rp,
    'awarded_rp', 10
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

