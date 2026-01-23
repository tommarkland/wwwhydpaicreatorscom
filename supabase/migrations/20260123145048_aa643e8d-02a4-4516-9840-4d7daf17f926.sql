-- Add policy to allow reading evaluations via shared report tokens
CREATE POLICY "Anyone can view evaluations via shared report token"
ON public.evaluations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shared_reports sr
    WHERE sr.evaluation_id = evaluations.id
    AND (sr.expires_at IS NULL OR sr.expires_at > now())
  )
);