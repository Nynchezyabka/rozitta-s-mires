ALTER TABLE public.outfits ADD COLUMN kind text NOT NULL DEFAULT 'look' CHECK (kind IN ('look','capsule')), ADD COLUMN packed_ids uuid[] NOT NULL DEFAULT '{}';
CREATE OR REPLACE FUNCTION public.k_outfits(_token text) RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT coalesce(json_agg(o ORDER BY o.created_at DESC),'[]') FROM (SELECT id,name,owner,kind,photo_path,cloth_ids,packed_ids,created_at FROM outfits WHERE household_id=k_hid(_token)) o;
$$;
CREATE OR REPLACE FUNCTION public.k_save_outfit(_token text, _o json) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h uuid := k_hid(_token); nid uuid := nullif(_o->>'id','')::uuid; pp text := nullif(_o->>'photo_path',''); ids uuid[]; packed uuid[];
BEGIN
 IF h IS NULL THEN RAISE EXCEPTION 'Дом не найден'; END IF;
 IF pp IS NOT NULL AND split_part(pp,'/',1) <> h::text THEN RAISE EXCEPTION 'Фото не сохранилось'; END IF;
 ids := ARRAY(SELECT c.id FROM clothes c WHERE c.household_id=h AND c.id::text IN (SELECT json_array_elements_text(coalesce(_o->'cloth_ids','[]'::json))));
 packed := ARRAY(SELECT c.id FROM clothes c WHERE c.id=ANY(ids) AND c.id::text IN (SELECT json_array_elements_text(coalesce(_o->'packed_ids','[]'::json))));
 IF nid IS NOT NULL THEN
 UPDATE outfits SET name=left(coalesce(_o->>'name',''),80), owner=left(coalesce(_o->>'owner',''),40),kind=coalesce(_o->>'kind',kind), cloth_ids=ids,packed_ids=packed, photo_path=coalesce(pp,photo_path) WHERE id=nid AND household_id=h;
 IF NOT FOUND THEN RAISE EXCEPTION 'Образ не найден'; END IF;
 ELSE
 INSERT INTO outfits(household_id,name,owner,kind,photo_path,cloth_ids,packed_ids) VALUES (h,left(coalesce(_o->>'name',''),80),left(coalesce(_o->>'owner',''),40),coalesce(_o->>'kind','look'),pp,ids,packed) RETURNING id INTO nid;
 END IF;
 RETURN nid;
END $$;