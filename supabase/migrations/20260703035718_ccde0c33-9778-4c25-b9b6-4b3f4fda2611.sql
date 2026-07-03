CREATE POLICY "Backend can manage bookings"
ON public.bookings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);