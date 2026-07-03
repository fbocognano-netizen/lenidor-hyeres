CREATE POLICY "Backend can manage booking notifications"
ON public.booking_notifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);