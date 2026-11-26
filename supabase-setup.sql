-- Коробки: полная настройка базы для своего Supabase. Вставьте целиком в SQL Editor и нажмите Run.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Наш дом',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18),'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#888888',
  icon text NOT NULL DEFAULT '📦',
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  number int NOT NULL,
  group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  photo_path text,
  note text,
  decide_by date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, number)
);
CREATE TABLE public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id uuid NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'item',
  author text,
  needs_review boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.items(household_id);
CREATE INDEX ON public.boxes(household_id);
GRANT ALL ON public.households, public.groups, public.boxes, public.items TO service_role;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boxes ADD COLUMN kid_size text, ADD COLUMN kid_season text, ADD COLUMN deleted_at timestamptz;
CREATE OR REPLACE FUNCTION public.k_hid(_token text) RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE h uuid;
BEGIN
  SELECT id INTO h FROM households WHERE token = _token AND length(_token) >= 20;
  IF h IS NULL THEN RAISE EXCEPTION 'Дом не найден — проверьте ссылку'; END IF;
  RETURN h;
END $$;

CREATE OR REPLACE FUNCTION public.k_create_household(_name text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h households;
BEGIN
  INSERT INTO households(name) VALUES (coalesce(nullif(left(trim(_name),60),''),'Наш дом')) RETURNING * INTO h;
  INSERT INTO groups(household_id,name,color,icon,position) VALUES
    (h.id,'Постель и текстиль','#7FA7C9','🛏️',0),(h.id,'Детское','#F2B84B','🧸',1),
    (h.id,'Документы и бумаги','#8C7B6B','📄',2),(h.id,'Кухня','#D9694A','🍳',3),
    (h.id,'Одежда','#8FB573','👕',4),(h.id,'Книги','#A57BC4','📚',5),(h.id,'Решить позже','#B0B0B0','⏳',6);
  RETURN h.token;
END $$;

CREATE OR REPLACE FUNCTION public.k_get(_token text) RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE h uuid := k_hid(_token);
BEGIN
  RETURN json_build_object(
    'household', (SELECT json_build_object('id',id,'name',name) FROM households WHERE id=h),
    'groups', coalesce((SELECT json_agg(g ORDER BY g.position) FROM (SELECT id,name,color,icon,position FROM groups WHERE household_id=h) g),'[]'),
    'boxes', coalesce((SELECT json_agg(b ORDER BY b.number) FROM (SELECT id,number,group_id,photo_path,note,decide_by,kid_size,kid_season,created_at FROM boxes WHERE household_id=h AND deleted_at IS NULL) b),'[]'),
    'items', coalesce((SELECT json_agg(i ORDER BY i.created_at) FROM (SELECT it.id,it.box_id,it.name,it.kind,it.author,it.needs_review,it.created_at FROM items it JOIN boxes bx ON bx.id=it.box_id WHERE it.household_id=h AND bx.deleted_at IS NULL) i),'[]')
  );
END $$;

CREATE OR REPLACE FUNCTION public.k_rename(_token text, _name text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE households SET name = left(_name,60) WHERE id = k_hid(_token);
$$;

CREATE OR REPLACE FUNCTION public.k_save_group(_token text, _id uuid, _name text, _color text, _icon text, _position int) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h uuid := k_hid(_token);
BEGIN
  IF _id IS NOT NULL THEN UPDATE groups SET name=left(_name,60), color=_color, icon=_icon WHERE id=_id AND household_id=h;
  ELSE INSERT INTO groups(household_id,name,color,icon,position) VALUES (h,left(_name,60),_color,_icon,coalesce(_position,99)); END IF;
END $$;

CREATE OR REPLACE FUNCTION public.k_delete_group(_token text, _id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM groups WHERE id=_id AND household_id=k_hid(_token);
$$;

CREATE OR REPLACE FUNCTION public.k_save_box(_token text, _box json, _items json) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h uuid := k_hid(_token); bid uuid := nullif(_box->>'id','')::uuid; n int;
BEGIN
  IF bid IS NOT NULL THEN
    UPDATE boxes SET group_id=nullif(_box->>'group_id','')::uuid, note=_box->>'note', decide_by=nullif(_box->>'decide_by','')::date,
      kid_size=nullif(_box->>'kid_size',''), kid_season=nullif(_box->>'kid_season',''),
      photo_path=coalesce(nullif(_box->>'photo_path',''),photo_path)
    WHERE id=bid AND household_id=h;
    IF NOT FOUND THEN RAISE EXCEPTION 'Коробка не найдена'; END IF;
  ELSE
    SELECT coalesce(max(number),0)+1 INTO n FROM boxes WHERE household_id=h;
    INSERT INTO boxes(household_id,number,group_id,note,decide_by,kid_size,kid_season,photo_path)
    VALUES (h,n,nullif(_box->>'group_id','')::uuid,_box->>'note',nullif(_box->>'decide_by','')::date,
      nullif(_box->>'kid_size',''),nullif(_box->>'kid_season',''),nullif(_box->>'photo_path','')) RETURNING id INTO bid;
  END IF;
  DELETE FROM items WHERE box_id=bid;
  INSERT INTO items(box_id,household_id,name,kind,author,needs_review)
  SELECT bid,h,left(trim(x->>'name'),200), CASE WHEN x->>'kind'='book' THEN 'book' ELSE 'item' END,
    nullif(trim(coalesce(x->>'author','')),''), coalesce((x->>'needs_review')::boolean,false)
  FROM json_array_elements(coalesce(_items,'[]')) x WHERE trim(coalesce(x->>'name',''))<>'';
  RETURN bid;
END $$;

CREATE OR REPLACE FUNCTION public.k_trash_box(_token text, _id uuid, _deleted boolean) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE boxes SET deleted_at = CASE WHEN _deleted THEN now() ELSE NULL END WHERE id=_id AND household_id=k_hid(_token);
$$;

REVOKE ALL ON FUNCTION public.k_hid(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.k_create_household(text), public.k_get(text), public.k_rename(text,text),
  public.k_save_group(text,uuid,text,text,text,int), public.k_delete_group(text,uuid),
  public.k_save_box(text,json,json), public.k_trash_box(text,uuid,boolean) TO anon, authenticated;

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
INSERT INTO storage.buckets (id, name, public) VALUES ('photos','photos',false) ON CONFLICT DO NOTHING;

-- ===== Место сундука и заметки дома =====
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
-- === Весь дом (things) ===
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
-- ===== До 5 фото на сундук и восстановление с прежними номерами =====
ALTER TABLE public.boxes ADD COLUMN IF NOT EXISTS photo_paths text[] NOT NULL DEFAULT '{}';
UPDATE public.boxes SET photo_paths = ARRAY[photo_path] WHERE photo_path IS NOT NULL AND photo_paths = '{}';

CREATE OR REPLACE FUNCTION public.k_get(_token text) RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE h uuid := k_hid(_token);
BEGIN
  RETURN json_build_object(
    'household', (SELECT json_build_object('id',id,'name',name) FROM households WHERE id=h),
    'groups', coalesce((SELECT json_agg(g ORDER BY g.position) FROM (SELECT id,name,color,icon,position FROM groups WHERE household_id=h) g),'[]'),
    'boxes', coalesce((SELECT json_agg(b ORDER BY b.number) FROM (SELECT id,number,group_id,photo_path,photo_paths,note,decide_by,kid_size,kid_season,location,created_at FROM boxes WHERE household_id=h AND deleted_at IS NULL) b),'[]'),
    'items', coalesce((SELECT json_agg(i ORDER BY i.created_at) FROM (SELECT it.id,it.box_id,it.name,it.kind,it.author,it.needs_review,it.created_at FROM items it JOIN boxes bx ON bx.id=it.box_id WHERE it.household_id=h AND bx.deleted_at IS NULL) i),'[]'),
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
  INSERT INTO items(box_id,household_id,name,kind,author,needs_review)
  SELECT bid,h,left(trim(x->>'name'),200), CASE WHEN x->>'kind'='book' THEN 'book' ELSE 'item' END,
    nullif(trim(coalesce(x->>'author','')),''), coalesce((x->>'needs_review')::boolean,false)
  FROM json_array_elements(coalesce(_items,'[]')) x WHERE trim(coalesce(x->>'name',''))<>'';
  RETURN bid;
END $$;
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

-- ===== Гардероб =====
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

GRANT EXECUTE ON FUNCTION public.k_clothes(text), public.k_save_cloth(text,json), public.k_delete_cloth(text,uuid) TO anon, authenticated;ALTER TABLE public.clothes ADD COLUMN category text NOT NULL DEFAULT '', ADD COLUMN color text NOT NULL DEFAULT '';

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

-- ===== Быстрые решения и корзина сундуков =====
CREATE OR REPLACE FUNCTION public.k_trash(_token text) RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE h uuid := public.k_hid(_token);
BEGIN
 RETURN coalesce((SELECT json_agg(b ORDER BY b.deleted_at DESC) FROM (SELECT id,number,note,location,deleted_at FROM public.boxes WHERE household_id=h AND deleted_at IS NOT NULL) b),'[]'::json);
END $$;
CREATE OR REPLACE FUNCTION public.k_decide_box(_token text, _id uuid, _date date) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h uuid := public.k_hid(_token);
BEGIN
 UPDATE public.boxes SET decide_by=_date WHERE id=_id AND household_id=h AND deleted_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Сундук не найден'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.k_trash(text), public.k_decide_box(text,uuid,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.k_trash(text), public.k_decide_box(text,uuid,date) TO anon, authenticated, service_role;