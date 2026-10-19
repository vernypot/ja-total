-- Fix: member portal inbox/profile RPCs failed with
-- "cannot execute UPDATE in a read-only transaction"
-- because STABLE + member_portal_verify_session() updates last_seen_at.
-- Run in Supabase Dashboard → SQL Editor.

ALTER FUNCTION public.member_portal_list_mensajes(TEXT) VOLATILE;
ALTER FUNCTION public.member_portal_unread_mensaje_count(TEXT) VOLATILE;
ALTER FUNCTION public.member_portal_list_club_birthdays(TEXT, UUID) VOLATILE;
ALTER FUNCTION public.member_portal_list_club_directory(TEXT, UUID) VOLATILE;
ALTER FUNCTION public.member_portal_get_profile(TEXT) VOLATILE;

NOTIFY pgrst, 'reload schema';
