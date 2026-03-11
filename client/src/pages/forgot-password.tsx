import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { usePageTitle } from "@/hooks/use-page-title";

export default function ForgotPassword() {
  usePageTitle("Recupera Password");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Email richiesta", description: "Inserisci la tua email.", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      await apiRequest("POST", "/api/auth/forgot-password", { email: email.trim() });
      setSent(true);
    } catch (error: any) {
      toast({ title: "Errore", description: error.message || "Si è verificato un errore.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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
          <p className="text-gray-500 dark:text-gray-400">Recupera la tua password</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Mail className="w-5 h-5 text-green-500" />
              Password dimenticata?
            </CardTitle>
            <CardDescription>
              {sent
                ? "Controlla la tua casella email"
                : "Inserisci la tua email e ti invieremo un link per reimpostare la password"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Se l'indirizzo <strong>{email}</strong> è associato a un account, riceverai un'email con le istruzioni per reimpostare la password.
                  </p>
                  <p className="text-xs text-gray-500">
                    Il link scade tra 1 ora. Controlla anche la cartella spam.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button
                    variant="outline"
                    onClick={() => { setSent(false); setEmail(""); }}
                    data-testid="button-retry-reset"
                  >
                    Invia di nuovo
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setLocation("/auth")}
                    className="text-green-600"
                    data-testid="link-back-login"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Torna al login
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="la-tua-email@esempio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    data-testid="input-forgot-email"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading} data-testid="button-send-reset">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Invia link di recupero
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-green-600"
                  onClick={() => setLocation("/auth")}
                  data-testid="link-back-login-form"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Torna al login
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
