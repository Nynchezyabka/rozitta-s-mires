ALTER TABLE public.boxes ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;
CREATE OR REPLACE FUNCTION public.k_bump_box_revision() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.revision := OLD.revision + 1; RETURN NEW; END $$;
CREATE TRIGGER bump_box_revision BEFORE UPDATE ON public.boxes FOR EACH ROW EXECUTE FUNCTION public.k_bump_box_revision();
CREATE OR REPLACE FUNCTION public.k_get(_token text) RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE h uuid := k_hid(_token);
BEGIN RETURN json_build_object(
'household', (SELECT json_build_object('id',id,'name',name) FROM households WHERE id=h),
'groups', coalesce((SELECT json_agg(g ORDER BY g.position) FROM (SELECT id,name,color,icon,position FROM groups WHERE household_id=h) g),'[]'),
'boxes', coalesce((SELECT json_agg(b ORDER BY b.number) FROM (SELECT id,number,group_id,photo_path,photo_paths,note,decide_by,kid_size,kid_season,location,created_at,revision FROM boxes WHERE household_id=h AND deleted_at IS NULL) b),'[]'),
'items', coalesce((SELECT json_agg(i ORDER BY i.created_at) FROM (SELECT it.id,it.box_id,it.name,it.kind,it.author,it.needs_review,it.category,it.created_at FROM items it JOIN boxes bx ON bx.id=it.box_id WHERE it.household_id=h AND bx.deleted_at IS NULL) i),'[]'),
'notes', coalesce((SELECT json_agg(n ORDER BY n.updated_at DESC) FROM (SELECT id,title,body,updated_at FROM notes WHERE household_id=h) n),'[]')); END $$;
CREATE OR REPLACE FUNCTION public.k_save_box_checked(_token text, _box json, _items json, _revision integer) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h uuid := k_hid(_token); bid uuid := nullif(_box->>'id','')::uuid; current_revision integer; gone timestamptz; restoring boolean := coalesce((_box->>'restore')::boolean,false);
BEGIN
IF bid IS NOT NULL AND NOT restoring THEN
 SELECT revision,deleted_at INTO current_revision,gone FROM public.boxes WHERE id=bid AND household_id=h FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Сундук не найден в этом доме'; END IF;
 IF gone IS NOT NULL OR _revision IS NULL OR current_revision <> _revision THEN RAISE EXCEPTION 'BOX_CONFLICT'; END IF;
END IF;
bid := public.k_save_box(_token,_box,_items);
RETURN (SELECT json_build_object('id',id,'revision',revision) FROM public.boxes WHERE id=bid AND household_id=h);
END $$;
REVOKE ALL ON FUNCTION public.k_save_box_checked(text,json,json,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.k_save_box_checked(text,json,json,integer) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.k_move_box(_token text, _id uuid, _location text, _revision integer) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h uuid := k_hid(_token); current_revision integer; gone timestamptz; next_revision integer;
BEGIN
SELECT revision,deleted_at INTO current_revision,gone FROM public.boxes WHERE id=_id AND household_id=h FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Сундук не найден в этом доме'; END IF;
IF gone IS NOT NULL OR _revision IS NULL OR current_revision <> _revision THEN RAISE EXCEPTION 'BOX_CONFLICT'; END IF;
UPDATE public.boxes SET location=left(nullif(trim(coalesce(_location,'')),''),80) WHERE id=_id AND household_id=h RETURNING revision INTO next_revision;
RETURN next_revision;
END $$;
REVOKE ALL ON FUNCTION public.k_move_box(text,uuid,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.k_move_box(text,uuid,text,integer) TO anon, authenticated, service_role;