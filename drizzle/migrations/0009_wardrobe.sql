CREATE TABLE public.clothes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  owner text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  layer text NOT NULL DEFAULT 'top',
  season text NOT NULL DEFAULT 'all',
  status text NOT NULL DEFAULT 'closet',
  size text NOT NULL DEFAULT '',
  box_id uuid REFERENCES public.boxes(id) ON DELETE SET NULL,
  photo_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.clothes TO service_role;
ALTER TABLE public.clothes ENABLE ROW LEVEL SECURITY;
CREATE INDEX clothes_household_idx ON public.clothes(household_id);

CREATE OR REPLACE FUNCTION public.k_clothes(_token text) RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(json_agg(c ORDER BY c.created_at DESC),'[]') FROM (SELECT id,owner,name,layer,season,status,size,box_id,photo_path,created_at FROM clothes WHERE household_id=k_hid(_token)) c;
$$;

CREATE OR REPLACE FUNCTION public.k_save_cloth(_token text, _c json) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h uuid := k_hid(_token); nid uuid := nullif(_c->>'id','')::uuid; pp text := nullif(_c->>'photo_path',''); bx uuid := nullif(_c->>'box_id','')::uuid;
BEGIN
  IF h IS NULL THEN RAISE EXCEPTION 'Дом не найден'; END IF;
  IF pp IS NOT NULL AND split_part(pp,'/',1) <> h::text THEN RAISE EXCEPTION 'Фото не сохранилось'; END IF;
  IF bx IS NOT NULL AND NOT EXISTS (SELECT 1 FROM boxes WHERE id=bx AND household_id=h) THEN bx := NULL; END IF;
  IF nid IS NOT NULL THEN
    UPDATE clothes SET owner=left(coalesce(_c->>'owner',''),40), name=left(coalesce(_c->>'name',''),120),
      layer=left(coalesce(_c->>'layer','top'),20), season=left(coalesce(_c->>'season','all'),20),
      status=left(coalesce(_c->>'status','closet'),20), size=left(coalesce(_c->>'size',''),30),
      box_id=bx, photo_path=coalesce(pp, photo_path)
    WHERE id=nid AND household_id=h;
    IF NOT FOUND THEN RAISE EXCEPTION 'Вещь не найдена'; END IF;
  ELSE
    INSERT INTO clothes(household_id,owner,name,layer,season,status,size,box_id,photo_path)
    VALUES (h,left(coalesce(_c->>'owner',''),40),left(coalesce(_c->>'name',''),120),left(coalesce(_c->>'layer','top'),20),
      left(coalesce(_c->>'season','all'),20),left(coalesce(_c->>'status','closet'),20),left(coalesce(_c->>'size',''),30),bx,pp)
    RETURNING id INTO nid;
  END IF;
  RETURN nid;
END $$;

CREATE OR REPLACE FUNCTION public.k_delete_cloth(_token text, _id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM clothes WHERE id=_id AND household_id=k_hid(_token);
$$;

GRANT EXECUTE ON FUNCTION public.k_clothes(text), public.k_save_cloth(text,json), public.k_delete_cloth(text,uuid) TO anon, authenticated;