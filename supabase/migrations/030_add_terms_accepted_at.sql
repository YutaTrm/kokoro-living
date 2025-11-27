-- Add terms_accepted_at column to users table
-- This column tracks when a user accepted the terms of service

ALTER TABLE public.users
ADD COLUMN terms_accepted_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries
CREATE INDEX idx_users_terms_accepted_at ON public.users(terms_accepted_at);

COMMENT ON COLUMN public.users.terms_accepted_at IS 'Timestamp when user accepted the terms of service. NULL means not accepted yet.';
