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