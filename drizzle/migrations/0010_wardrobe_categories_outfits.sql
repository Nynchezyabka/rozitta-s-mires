ALTER TABLE public.clothes ADD COLUMN category text NOT NULL DEFAULT '', ADD COLUMN color text NOT NULL DEFAULT '';

CREATE TABLE public.outfits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  owner text NOT NULL DEFAULT '',
  photo_path text,
  cloth_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.outfits TO service_role;
ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;
CREATE INDEX outfits_household_idx ON public.outfits(household_id);

CREATE OR REPLACE FUNCTION public.k_clothes(_token text) RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(json_agg(c ORDER BY c.created_at DESC),'[]') FROM (SELECT id,owner,name,layer,season,status,size,box_id,photo_path,category,color,created_at FROM clothes WHERE household_id=k_hid(_token)) c;
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
      category=left(coalesce(_c->>'category',''),40), color=left(coalesce(_c->>'color',''),30),
      box_id=bx, photo_path=coalesce(pp, photo_path)
    WHERE id=nid AND household_id=h;
    IF NOT FOUND THEN RAISE EXCEPTION 'Вещь не найдена'; END IF;
  ELSE
    INSERT INTO clothes(household_id,owner,name,layer,season,status,size,category,color,box_id,photo_path)
    VALUES (h,left(coalesce(_c->>'owner',''),40),left(coalesce(_c->>'name',''),120),left(coalesce(_c->>'layer','top'),20),
      left(coalesce(_c->>'season','all'),20),left(coalesce(_c->>'status','closet'),20),left(coalesce(_c->>'size',''),30),
      left(coalesce(_c->>'category',''),40),left(coalesce(_c->>'color',''),30),bx,pp)
    RETURNING id INTO nid;
  END IF;
  RETURN nid;
END $$;

CREATE OR REPLACE FUNCTION public.k_outfits(_token text) RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(json_agg(o ORDER BY o.created_at DESC),'[]') FROM (SELECT id,name,owner,photo_path,cloth_ids,created_at FROM outfits WHERE household_id=k_hid(_token)) o;
$$;

CREATE OR REPLACE FUNCTION public.k_save_outfit(_token text, _o json) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h uuid := k_hid(_token); nid uuid := nullif(_o->>'id','')::uuid; pp text := nullif(_o->>'photo_path','');
  ids uuid[] := ARRAY(SELECT c.id FROM clothes c WHERE c.household_id=h AND c.id::text IN (SELECT json_array_elements_text(coalesce(_o->'cloth_ids','[]'::json))));
BEGIN
  IF h IS NULL THEN RAISE EXCEPTION 'Дом не найден'; END IF;
  IF pp IS NOT NULL AND split_part(pp,'/',1) <> h::text THEN RAISE EXCEPTION 'Фото не сохранилось'; END IF;
  IF nid IS NOT NULL THEN
    UPDATE outfits SET name=left(coalesce(_o->>'name',''),80), owner=left(coalesce(_o->>'owner',''),40), cloth_ids=ids, photo_path=coalesce(pp, photo_path)
    WHERE id=nid AND household_id=h;
    IF NOT FOUND THEN RAISE EXCEPTION 'Образ не найден'; END IF;
  ELSE
    INSERT INTO outfits(household_id,name,owner,photo_path,cloth_ids)
    VALUES (h,left(coalesce(_o->>'name',''),80),left(coalesce(_o->>'owner',''),40),pp,ids) RETURNING id INTO nid;
  END IF;
  RETURN nid;
END $$;

CREATE OR REPLACE FUNCTION public.k_delete_outfit(_token text, _id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM outfits WHERE id=_id AND household_id=k_hid(_token);
$$;

GRANT EXECUTE ON FUNCTION public.k_outfits(text), public.k_save_outfit(text,json), public.k_delete_outfit(text,uuid) TO anon, authenticated;