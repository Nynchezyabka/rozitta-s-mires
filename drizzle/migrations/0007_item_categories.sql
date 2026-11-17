-- ===== Метки-категории у вещей =====
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS category text;

CREATE OR REPLACE FUNCTION public.k_get(_token text) RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE h uuid := k_hid(_token);
BEGIN
  RETURN json_build_object(
    'household', (SELECT json_build_object('id',id,'name',name) FROM households WHERE id=h),
    'groups', coalesce((SELECT json_agg(g ORDER BY g.position) FROM (SELECT id,name,color,icon,position FROM groups WHERE household_id=h) g),'[]'),
    'boxes', coalesce((SELECT json_agg(b ORDER BY b.number) FROM (SELECT id,number,group_id,photo_path,photo_paths,note,decide_by,kid_size,kid_season,location,created_at FROM boxes WHERE household_id=h AND deleted_at IS NULL) b),'[]'),
    'items', coalesce((SELECT json_agg(i ORDER BY i.created_at) FROM (SELECT it.id,it.box_id,it.name,it.kind,it.author,it.needs_review,it.category,it.created_at FROM items it JOIN boxes bx ON bx.id=it.box_id WHERE it.household_id=h AND bx.deleted_at IS NULL) i),'[]'),
    'notes', coalesce((SELECT json_agg(n ORDER BY n.updated_at DESC) FROM (SELECT id,title,body,updated_at FROM notes WHERE household_id=h) n),'[]')
  );
END $$;

CREATE OR REPLACE FUNCTION public.k_save_box(_token text, _box json, _items json) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h uuid := k_hid(_token); bid uuid := nullif(_box->>'id','')::uuid; n int; pp text := nullif(_box->>'photo_path','');
  pps text[]; restoring boolean := coalesce((_box->>'restore')::boolean,false); p text;
BEGIN
  IF _box->'photo_paths' IS NOT NULL AND json_typeof(_box->'photo_paths')='array' THEN
    SELECT coalesce(array_agg(x),'{}') INTO pps FROM (SELECT json_array_elements_text(_box->'photo_paths') x LIMIT 5) s;
    FOREACH p IN ARRAY pps LOOP
      IF split_part(p,'/',1) <> h::text THEN RAISE EXCEPTION 'Фото не сохранилось'; END IF;
    END LOOP;
    pp := pps[1];
  ELSIF pp IS NOT NULL THEN
    IF split_part(pp,'/',1) <> h::text THEN RAISE EXCEPTION 'Фото не сохранилось'; END IF;
    pps := ARRAY[pp];
  END IF;
  IF restoring THEN
    IF bid IS NULL OR (_box->>'number') IS NULL THEN RAISE EXCEPTION 'В копии нет номера сундука'; END IF;
    IF EXISTS (SELECT 1 FROM boxes WHERE id=bid AND household_id=h) THEN RETURN bid; END IF;
    IF EXISTS (SELECT 1 FROM boxes WHERE id=bid) THEN RAISE EXCEPTION 'Сундук из копии уже есть в другом доме'; END IF;
    IF EXISTS (SELECT 1 FROM boxes WHERE household_id=h AND number=(_box->>'number')::int) THEN RAISE EXCEPTION 'Номер % уже занят в этом доме', _box->>'number'; END IF;
    INSERT INTO boxes(id,household_id,number,group_id,note,decide_by,kid_size,kid_season,location)
    VALUES (bid,h,(_box->>'number')::int,nullif(_box->>'group_id','')::uuid,_box->>'note',nullif(_box->>'decide_by','')::date,
      nullif(_box->>'kid_size',''),nullif(_box->>'kid_season',''),left(nullif(trim(coalesce(_box->>'location','')),''),80));
  ELSIF bid IS NOT NULL THEN
    UPDATE boxes SET group_id=nullif(_box->>'group_id','')::uuid, note=_box->>'note', decide_by=nullif(_box->>'decide_by','')::date,
      kid_size=nullif(_box->>'kid_size',''), kid_season=nullif(_box->>'kid_season',''),
      location=left(nullif(trim(coalesce(_box->>'location','')),''),80),
      photo_path=CASE WHEN pps IS NULL THEN photo_path ELSE pp END,
      photo_paths=coalesce(pps,photo_paths)
    WHERE id=bid AND household_id=h;
    IF NOT FOUND THEN RAISE EXCEPTION 'Коробка не найдена'; END IF;
  ELSE
    SELECT coalesce(max(number),0)+1 INTO n FROM boxes WHERE household_id=h;
    INSERT INTO boxes(household_id,number,group_id,note,decide_by,kid_size,kid_season,location,photo_path,photo_paths)
    VALUES (h,n,nullif(_box->>'group_id','')::uuid,_box->>'note',nullif(_box->>'decide_by','')::date,
      nullif(_box->>'kid_size',''),nullif(_box->>'kid_season',''),left(nullif(trim(coalesce(_box->>'location','')),''),80),pp,coalesce(pps,'{}')) RETURNING id INTO bid;
  END IF;
  DELETE FROM items WHERE box_id=bid;
  INSERT INTO items(box_id,household_id,name,kind,author,needs_review,category)
  SELECT bid,h,left(trim(x->>'name'),200), CASE WHEN x->>'kind'='book' THEN 'book' ELSE 'item' END,
    nullif(trim(coalesce(x->>'author','')),''), coalesce((x->>'needs_review')::boolean,false),
    left(nullif(trim(coalesce(x->>'category','')),''),40)
  FROM json_array_elements(coalesce(_items,'[]')) x WHERE trim(coalesce(x->>'name',''))<>'';
  RETURN bid;
END $$;
