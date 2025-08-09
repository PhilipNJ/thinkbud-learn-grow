
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const Auth = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

  // form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // name used only for signup; we still try to read it from user metadata if present
  const [name, setName] = useState("");

  useEffect(() => {
    // If already logged in, go home
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const ensureProfile = async (userId: string, userEmail?: string | null, displayName?: string | null) => {
    console.log("[Auth] Ensuring profile exists for", userId);
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[Auth] Error checking profile:", error);
      // don't throw; allow flow to continue but inform user
      toast({
        title: "Profile check failed",
        description: "We'll try again later. You can still continue.",
      });
      return;
    }

    if (!data) {
      const insertRes = await supabase.from("profiles").insert({
        id: userId,
        email: userEmail ?? null,
        name: displayName ?? null,
      });
      if (insertRes.error) {
        console.error("[Auth] Error creating profile:", insertRes.error);
        toast({
          title: "Could not create profile",
          description: "Please try again.",
        });
        return;
      }
      console.log("[Auth] Profile created for", userId);
    } else {
      console.log("[Auth] Profile already exists");
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    console.log("[Auth] Logging in user", email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      console.error("[Auth] Login error:", error);
      toast({
        title: "Login failed",
        description: error.message,
      });
      return;
    }

    const session = data.session;
    const user = session?.user;
    if (user) {
      await ensureProfile(user.id, user.email, (user.user_metadata as any)?.name ?? null);
      toast({ title: "Welcome back!", description: "You are now signed in." });
      navigate("/");
    } else {
      // Shouldn't happen with password login, but handle defensively
      toast({
        title: "Check your inbox",
        description: "If email confirmation is on, please confirm your email to continue.",
      });
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    console.log("[Auth] Signing up user", email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });
    setLoading(false);

    if (error) {
      console.error("[Auth] Signup error:", error);
      toast({
        title: "Sign up failed",
        description: error.message,
      });
      return;
    }

    const session = data.session;
    const user = data.user ?? session?.user ?? null;

    if (user) {
      await ensureProfile(user.id, user.email, (user.user_metadata as any)?.name ?? name ?? null);
      toast({
        title: "Account created",
        description: "You are signed in.",
      });
      navigate("/");
    } else {
      toast({
        title: "Verify your email",
        description: "We sent you a confirmation link. Please confirm to sign in.",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to ThinkBud</CardTitle>
          <CardDescription>Log in or create an account to start your daily practice.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "signup")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </TabsContent>

            <TabsContent value="signup" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Student name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email2">Email</Label>
                <Input
                  id="email2"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password2">Password</Label>
                <Input
                  id="password2"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex gap-2">
          {activeTab === "login" ? (
            <Button className="w-full" onClick={handleLogin} disabled={loading || !email || !password}>
              {loading ? "Please wait..." : "Login"}
            </Button>
          ) : (
            <Button className="w-full" onClick={handleSignup} disabled={loading || !email || !password}>
              {loading ? "Please wait..." : "Create account"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default Auth;
