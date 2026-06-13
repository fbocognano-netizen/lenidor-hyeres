
DROP POLICY IF EXISTS "Anyone can submit a booking request" ON public.bookings;
REVOKE INSERT ON public.bookings FROM anon, authenticated;
