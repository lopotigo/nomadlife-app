import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, Loader2, Lock, ArrowLeft, CheckCircle, Eye, EyeOff, AlertTriangle, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { usePageTitle } from "@/hooks/use-page-title";

function PasswordStrengthMini({ password }: { password: string }) {
  if (!password) return null;
  const ok = password.length >= 8;
  return (
    <div className={`flex items-center gap-1.5 text-xs ${ok ? "text-emerald-500" : "text-gray-400"}`}>
      {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      Almeno 8 caratteri
    </div>
  );
}

export default function ResetPassword() {
  usePageTitle("Reimposta Password");
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const params = new URLSearchParams(search);
  const token = params.get("token");

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setVerifying(false);
        return;
      }
      try {
        const res = await fetch(`/api/auth/verify-reset-token?token=${token}`);
        if (res.ok) {
          setTokenValid(true);
        }
      } catch (error) {
        console.error("Token verification error:", error);
      } finally {
        setVerifying(false);
      }
    }
    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: "Errore", description: "Le password non corrispondono.", variant: "destructive" });
      return;
    }

    if (password.length < 8) {
      toast({ title: "Password troppo corta", description: "La password deve avere almeno 8 caratteri.", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      await apiRequest("POST", "/api/auth/reset-password", { token, newPassword: password });
      setSuccess(true);
      toast({ title: "Password aggiornata!", description: "Ora puoi accedere con la nuova password." });
    } catch (error: any) {
      toast({ title: "Errore", description: error.message || "Si è verificato un errore.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Plane className="w-8 h-8 text-green-500" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
              NomadLife
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400">Reimposta la tua password</p>
        </div>

        <Card className="border-0 shadow-xl">
          {!token || !tokenValid ? (
            <>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                  </div>
                </div>
                <CardTitle>Link non valido</CardTitle>
                <CardDescription>
                  Il link di recupero password non è valido o è scaduto. Richiedi un nuovo link.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Button onClick={() => setLocation("/forgot-password")} data-testid="button-new-reset">
                  Richiedi nuovo link
                </Button>
                <Button variant="ghost" onClick={() => setLocation("/auth")} className="text-green-600" data-testid="link-back-login-invalid">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Torna al login
                </Button>
              </CardContent>
            </>
          ) : success ? (
            <>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </div>
                <CardTitle>Password aggiornata!</CardTitle>
                <CardDescription>
                  La tua password è stata reimpostata con successo. Ora puoi accedere con la nuova password.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => setLocation("/auth")} data-testid="button-go-login">
                  Vai al login
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Lock className="w-5 h-5 text-green-500" />
                  Nuova password
                </CardTitle>
                <CardDescription>
                  Scegli una nuova password sicura per il tuo account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Nuova password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Inserisci la nuova password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        data-testid="input-new-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <PasswordStrengthMini password={password} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Conferma password</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Ripeti la nuova password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      data-testid="input-confirm-password"
                    />
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <X className="w-3 h-3" />
                        Le password non corrispondono
                      </p>
                    )}
                    {confirmPassword && password === confirmPassword && (
                      <p className="text-xs text-emerald-500 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Le password corrispondono
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={loading || password !== confirmPassword} data-testid="button-reset-password">
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Reimposta password
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-green-600"
                    onClick={() => setLocation("/auth")}
                    data-testid="link-back-login-reset"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Torna al login
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
