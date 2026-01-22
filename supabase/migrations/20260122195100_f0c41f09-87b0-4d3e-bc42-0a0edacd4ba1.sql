-- Fix the overly permissive system_logs policy by adding user_id check
DROP POLICY IF EXISTS "System can insert logs" ON public.system_logs;

CREATE POLICY "Users can insert their own logs" ON public.system_logs
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id);