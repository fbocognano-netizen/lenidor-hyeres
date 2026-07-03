CREATE TABLE public.booking_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'pingram',
  recipient_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  provider_status integer,
  provider_response text,
  error_message text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.booking_notifications TO service_role;

ALTER TABLE public.booking_notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX booking_notifications_booking_id_idx ON public.booking_notifications(booking_id);
CREATE INDEX booking_notifications_created_at_idx ON public.booking_notifications(created_at DESC);