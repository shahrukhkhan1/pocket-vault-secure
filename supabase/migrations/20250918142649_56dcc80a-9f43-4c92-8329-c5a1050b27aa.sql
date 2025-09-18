-- Create user profiles table
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create encrypted vault storage table
CREATE TABLE public.encrypted_vaults (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vault_data jsonb NOT NULL, -- Stores the encrypted vault data
  password_hint text, -- Optional hint (unencrypted)
  auth_check jsonb NOT NULL, -- Encrypted auth verification
  device_id text, -- For device tracking
  last_sync timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_id)
);

-- Create recovery codes table for password recovery
CREATE TABLE public.recovery_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL, -- Hashed recovery code
  used_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '1 year'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(code_hash)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encrypted_vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policies for encrypted vaults
CREATE POLICY "Users can view their own vaults" 
ON public.encrypted_vaults 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vaults" 
ON public.encrypted_vaults 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vaults" 
ON public.encrypted_vaults 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vaults" 
ON public.encrypted_vaults 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for recovery codes
CREATE POLICY "Users can view their own recovery codes" 
ON public.recovery_codes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recovery codes" 
ON public.recovery_codes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recovery codes" 
ON public.recovery_codes 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_encrypted_vaults_updated_at
  BEFORE UPDATE ON public.encrypted_vaults
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();