ALTER TABLE public.boxes ADD COLUMN IF NOT EXISTS location text;

CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.k_get(_token text) RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE h uuid := k_hid(_token);
BEGIN
  RETURN json_build_object(
    'household', (SELECT json_build_object('id',id,'name',name) FROM households WHERE id=h),
    'groups', coalesce((SELECT json_agg(g ORDER BY g.position) FROM (SELECT id,name,color,icon,position FROM groups WHERE household_id=h) g),'[]'),
    'boxes', coalesce((SELECT json_agg(b ORDER BY b.number) FROM (SELECT id,number,group_id,photo_path,note,decide_by,kid_size,kid_season,location,created_at FROM boxes WHERE household_id=h AND deleted_at IS NULL) b),'[]'),
    'items', coalesce((SELECT json_agg(i ORDER BY i.created_at) FROM (SELECT it.id,it.box_id,it.name,it.kind,it.author,it.needs_review,it.created_at FROM items it JOIN boxes bx ON bx.id=it.box_id WHERE it.household_id=h AND bx.deleted_at IS NULL) i),'[]'),
    'notes', coalesce((SELECT json_agg(n ORDER BY n.updated_at DESC) FROM (SELECT id,title,body,updated_at FROM notes WHERE household_id=h) n),'[]')
  );
END $$;

CREATE OR REPLACE FUNCTION public.k_save_box(_token text, _box json, _items json) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h uuid := k_hid(_token); bid uuid := nullif(_box->>'id','')::uuid; n int; pp text := nullif(_box->>'photo_path','');
BEGIN
  IF pp IS NOT NULL AND split_part(pp,'/',1) <> h::text THEN RAISE EXCEPTION 'Фото не сохранилось'; END IF;
  IF bid IS NOT NULL THEN
    UPDATE boxes SET group_id=nullif(_box->>'group_id','')::uuid, note=_box->>'note', decide_by=nullif(_box->>'decide_by','')::date,
      kid_size=nullif(_box->>'kid_size',''), kid_season=nullif(_box->>'kid_season',''),
      location=left(nullif(trim(coalesce(_box->>'location','')),''),80),
      photo_path=coalesce(pp,photo_path)
    WHERE id=bid AND household_id=h;
    IF NOT FOUND THEN RAISE EXCEPTION 'Коробка не найдена'; END IF;
  ELSE
    SELECT coalesce(max(number),0)+1 INTO n FROM boxes WHERE household_id=h;
    INSERT INTO boxes(household_id,number,group_id,note,decide_by,kid_size,kid_season,location,photo_path)
    VALUES (h,n,nullif(_box->>'group_id','')::uuid,_box->>'note',nullif(_box->>'decide_by','')::date,
      nullif(_box->>'kid_size',''),nullif(_box->>'kid_season',''),left(nullif(trim(coalesce(_box->>'location','')),''),80),pp) RETURNING id INTO bid;
  END IF;
  DELETE FROM items WHERE box_id=bid;
  INSERT INTO items(box_id,household_id,name,kind,author,needs_review)
  SELECT bid,h,left(trim(x->>'name'),200), CASE WHEN x->>'kind'='book' THEN 'book' ELSE 'item' END,
    nullif(trim(coalesce(x->>'author','')),''), coalesce((x->>'needs_review')::boolean,false)
  FROM json_array_elements(coalesce(_items,'[]')) x WHERE trim(coalesce(x->>'name',''))<>'';
  RETURN bid;
END $$;

CREATE OR REPLACE FUNCTION public.k_save_note(_token text, _id uuid, _title text, _body text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h uuid := k_hid(_token); nid uuid := _id;
BEGIN
  IF nid IS NOT NULL THEN
    UPDATE notes SET title=left(coalesce(_title,''),120), body=left(coalesce(_body,''),5000), updated_at=now() WHERE id=nid AND household_id=h;
    IF NOT FOUND THEN RAISE EXCEPTION 'Заметка не найдена'; END IF;
  ELSE
    INSERT INTO notes(household_id,title,body) VALUES (h,left(coalesce(_title,''),120),left(coalesce(_body,''),5000)) RETURNING id INTO nid;
  END IF;
  RETURN nid;
END $$;

CREATE OR REPLACE FUNCTION public.k_delete_note(_token text, _id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM notes WHERE id=_id AND household_id=k_hid(_token);
$$;

GRANT EXECUTE ON FUNCTION public.k_save_note(text,uuid,text,text), public.k_delete_note(text,uuid) TO anon, authenticated;