CREATE TABLE public.things (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  space text NOT NULL,
  title text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  watered_at timestamptz,
  fed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.things TO service_role;
ALTER TABLE public.things ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.k_things(_token text) RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(json_agg(t ORDER BY t.created_at DESC),'[]') FROM (SELECT id,space,title,note,watered_at,fed_at,created_at FROM things WHERE household_id=k_hid(_token)) t;
$$;

CREATE OR REPLACE FUNCTION public.k_save_thing(_token text, _id uuid, _space text, _title text, _note text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h uuid := k_hid(_token); nid uuid := _id;
BEGIN
  IF nid IS NOT NULL THEN
    UPDATE things SET title=left(coalesce(_title,''),120), note=left(coalesce(_note,''),2000) WHERE id=nid AND household_id=h;
    IF NOT FOUND THEN RAISE EXCEPTION 'Вещь не найдена'; END IF;
  ELSE
    INSERT INTO things(household_id,space,title,note) VALUES (h,left(_space,40),left(coalesce(_title,''),120),left(coalesce(_note,''),2000)) RETURNING id INTO nid;
  END IF;
  RETURN nid;
END $$;

CREATE OR REPLACE FUNCTION public.k_mark_thing(_token text, _id uuid, _kind text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _kind='water' THEN UPDATE things SET watered_at=now() WHERE id=_id AND household_id=k_hid(_token);
  ELSIF _kind='feed' THEN UPDATE things SET fed_at=now() WHERE id=_id AND household_id=k_hid(_token);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.k_delete_thing(_token text, _id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM things WHERE id=_id AND household_id=k_hid(_token);
$$;

GRANT EXECUTE ON FUNCTION public.k_things(text), public.k_save_thing(text,uuid,text,text,text), public.k_mark_thing(text,uuid,text), public.k_delete_thing(text,uuid) TO anon, authenticated;