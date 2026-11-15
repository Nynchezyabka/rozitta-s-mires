CREATE OR REPLACE FUNCTION public.k_header_hid() RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE t text; h uuid;
BEGIN
  t := nullif(current_setting('request.headers', true),'')::json->>'x-household-token';
  IF t IS NULL OR length(t) < 20 THEN RETURN NULL; END IF;
  SELECT id INTO h FROM households WHERE token = t;
  RETURN h;
END $$;
GRANT EXECUTE ON FUNCTION public.k_header_hid() TO anon, authenticated;

DROP POLICY IF EXISTS "upload box photos" ON storage.objects;
DROP POLICY IF EXISTS "read box photos" ON storage.objects;
CREATE POLICY "upload household photos" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'photos' AND (storage.foldername(name))[1] = public.k_header_hid()::text);
CREATE POLICY "read household photos" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = public.k_header_hid()::text);

CREATE OR REPLACE FUNCTION public.k_save_box(_token text, _box json, _items json) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h uuid := k_hid(_token); bid uuid := nullif(_box->>'id','')::uuid; n int; pp text := nullif(_box->>'photo_path','');
BEGIN
  IF pp IS NOT NULL AND split_part(pp,'/',1) <> h::text THEN RAISE EXCEPTION 'Фото не сохранилось'; END IF;
  IF bid IS NOT NULL THEN
    UPDATE boxes SET group_id=nullif(_box->>'group_id','')::uuid, note=_box->>'note', decide_by=nullif(_box->>'decide_by','')::date,
      kid_size=nullif(_box->>'kid_size',''), kid_season=nullif(_box->>'kid_season',''),
      photo_path=coalesce(pp,photo_path)
    WHERE id=bid AND household_id=h;
    IF NOT FOUND THEN RAISE EXCEPTION 'Коробка не найдена'; END IF;
  ELSE
    SELECT coalesce(max(number),0)+1 INTO n FROM boxes WHERE household_id=h;
    INSERT INTO boxes(household_id,number,group_id,note,decide_by,kid_size,kid_season,photo_path)
    VALUES (h,n,nullif(_box->>'group_id','')::uuid,_box->>'note',nullif(_box->>'decide_by','')::date,
      nullif(_box->>'kid_size',''),nullif(_box->>'kid_season',''),pp) RETURNING id INTO bid;
  END IF;
  DELETE FROM items WHERE box_id=bid;
  INSERT INTO items(box_id,household_id,name,kind,author,needs_review)
  SELECT bid,h,left(trim(x->>'name'),200), CASE WHEN x->>'kind'='book' THEN 'book' ELSE 'item' END,
    nullif(trim(coalesce(x->>'author','')),''), coalesce((x->>'needs_review')::boolean,false)
  FROM json_array_elements(coalesce(_items,'[]')) x WHERE trim(coalesce(x->>'name',''))<>'';
  RETURN bid;
END $$;