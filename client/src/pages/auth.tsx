import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plane, Loader2, Check, X, MapPin, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { usePageTitle } from "@/hooks/use-page-title";

declare global {
  interface Window {
    grecaptcha: any;
  }
}

const RECAPTCHA_V3_SITE_KEY = "6LdMNXYsAAAAABrnjRNQqrnq-JC4mObOiwcR8Lw1";

function loadRecaptchaScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.grecaptcha) { resolve(); return; }
    const existing = document.querySelector(`script[src*="recaptcha"]`);
    if (existing) { resolve(); return; }
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_V3_SITE_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load reCAPTCHA"));
    document.head.appendChild(script);
  });
}

async function getRecaptchaToken(action: string): Promise<string> {
  try {
    await loadRecaptchaScript();
  } catch {
    return "";
  }
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 15;
    const tryExecute = () => {
      if (window.grecaptcha?.execute) {
        window.grecaptcha.execute(RECAPTCHA_V3_SITE_KEY, { action }).then(resolve).catch(reject);
      } else {
        attempts++;
        if (attempts >= maxAttempts) {
          resolve("");
          return;
        }
        setTimeout(tryExecute, 200);
      }
    };
    tryExecute();
  });
}

interface CityResult {
  display_name: string;
  name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
  lat: string;
  lon: string;
}

function validatePassword(password: string) {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
}

function PasswordStrength({ password, t }: { password: string; t: (key: string) => string }) {
  const checks = validatePassword(password);
  const allValid = checks.minLength && checks.hasUppercase && checks.hasNumber && checks.hasSpecial;

  if (!password) return null;

  return (
    <div className="space-y-1 mt-2" data-testid="password-strength">
      {[
        { key: "minLength", label: t("auth.pw_min_length"), valid: checks.minLength },
        { key: "hasUppercase", label: t("auth.pw_uppercase"), valid: checks.hasUppercase },
        { key: "hasNumber", label: t("auth.pw_number"), valid: checks.hasNumber },
        { key: "hasSpecial", label: t("auth.pw_special"), valid: checks.hasSpecial },
      ].map(({ key, label, valid }) => (
        <div key={key} className={`flex items-center gap-1.5 text-xs ${valid ? "text-emerald-500" : "text-red-400"}`}>
          {valid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function CityAutocomplete({
  city,
  country,
  onCityChange,
  onCountryChange,
  disabled,
  t,
}: {
  city: string;
  country: string;
  onCityChange: (v: string) => void;
  onCountryChange: (v: string) => void;
  disabled: boolean;
  t: (key: string) => string;
}) {
  const [suggestions, setSuggestions] = useState<CityResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchCities = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=6&featuretype=city&accept-language=it`,
        { headers: { "User-Agent": "NomadLife/1.0" } }
      );
      const data: CityResult[] = await res.json();
      const cityResults = data.filter(
        (d) => d.address?.city || d.address?.town || d.address?.village || d.address?.municipality
      );
      setSuggestions(cityResults.length > 0 ? cityResults : data.slice(0, 5));
      setShowDropdown(true);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    onCityChange(value);
    onCountryChange("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCities(value), 300);
  };

  const selectCity = (result: CityResult) => {
    const cityName = result.address?.city || result.address?.town || result.address?.village || result.address?.municipality || result.name;
    const countryName = result.address?.country || "";
    onCityChange(cityName);
    onCountryChange(countryName);
    setShowDropdown(false);
    setSuggestions([]);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="signup-city">{t("auth.city")}</Label>
        <div ref={containerRef} className="relative">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="signup-city"
              value={city}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
              data-testid="input-signup-city"
              placeholder={t("auth.city_placeholder")}
              required
              disabled={disabled}
              className="pl-9"
              autoComplete="off"
            />
            {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto" data-testid="city-dropdown">
              {suggestions.map((s, i) => {
                const cityName = s.address?.city || s.address?.town || s.address?.village || s.address?.municipality || s.name;
                const countryName = s.address?.country || "";
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectCity(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors flex items-center gap-3 border-b border-border/30 last:border-0"
                    data-testid={`city-option-${i}`}
                  >
                    <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{cityName}</p>
                      <p className="text-xs text-muted-foreground">{countryName}{s.address?.state ? `, ${s.address.state}` : ""}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-country">{t("auth.country")}</Label>
        <Input
          id="signup-country"
          value={country}
          onChange={(e) => onCountryChange(e.target.value)}
          data-testid="input-signup-country"
          placeholder={t("auth.country_placeholder")}
          required
          disabled={disabled}
          className="bg-muted/50"
        />
      </div>
    </div>
  );
}

export default function Auth() {
  usePageTitle("Accedi");
  const { login, signup } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [signupPassword, setSignupPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    try {
      setLoading(true);
      let recaptchaToken: string | undefined;
      try {
        recaptchaToken = await getRecaptchaToken("login");
      } catch {
        console.warn("reCAPTCHA token acquisition failed");
      }
      await login(username, password, recaptchaToken);
      toast({ title: t("auth.welcome_toast"), description: t("auth.login_success") });
      setLocation("/");
    } catch (error: any) {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const checks = validatePassword(signupPassword);
    if (!checks.minLength || !checks.hasUppercase || !checks.hasNumber || !checks.hasSpecial) {
      toast({
        title: t("auth.error"),
        description: t("auth.pw_min_length"),
        variant: "destructive",
      });
      return;
    }

    if (!city.trim() || !country.trim()) {
      toast({
        title: t("auth.error"),
        description: t("auth.city"),
        variant: "destructive",
      });
      return;
    }

    if (!privacyAccepted) {
      toast({
        title: t("auth.error"),
        description: t("auth.terms_of_service"),
        variant: "destructive",
      });
      return;
    }

    const data = {
      username: formData.get("username") as string,
      email: formData.get("email") as string,
      password: signupPassword,
      name: formData.get("name") as string,
      bio: "",
      location: `${city}, ${country}`,
    };

    try {
      setLoading(true);
      let recaptchaToken: string | undefined;
      try {
        recaptchaToken = await getRecaptchaToken("signup");
      } catch {
        console.warn("reCAPTCHA token acquisition failed");
      }
      await signup({ ...data, recaptchaToken });
      toast({ title: t("auth.account_created"), description: t("auth.account_created_desc") });
      setLocation("/");
    } catch (error: any) {
      toast({ title: "Sign Up Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Plane className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-2">NomadLife</h1>
          <p className="text-muted-foreground">{t("auth.subtitle")}</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">{t("auth.login")}</TabsTrigger>
            <TabsTrigger value="signup">{t("auth.signup")}</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>{t("auth.welcome_back")}</CardTitle>
                <CardDescription>{t("auth.enter_credentials")}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username">Username</Label>
                    <Input
                      id="login-username"
                      name="username"
                      data-testid="input-login-username"
                      placeholder="marco"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      data-testid="input-login-password"
                      placeholder="••••••••"
                      required
                      disabled={loading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {t("auth.login")}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      className="text-sm text-green-600 hover:text-green-700 hover:underline"
                      onClick={() => setLocation("/forgot-password")}
                      data-testid="link-forgot-password"
                    >
                      {t("auth.forgot_password")}
                    </button>
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    {t("auth.login_terms")}{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" data-testid="link-terms-login">{t("auth.terms_of_service")}</a>
                    {" "}{t("auth.and_the")}{" "}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" data-testid="link-privacy-login">{t("auth.privacy_policy")}</a>.
                  </p>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>{t("auth.create_account")}</CardTitle>
                <CardDescription>{t("auth.join_community")}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">{t("auth.full_name")}</Label>
                    <Input
                      id="signup-name"
                      name="name"
                      data-testid="input-signup-name"
                      placeholder="Marco Rossi"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">Username</Label>
                    <Input
                      id="signup-username"
                      name="username"
                      data-testid="input-signup-username"
                      placeholder="marco_nomad"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      data-testid="input-signup-email"
                      placeholder="marco@example.com"
                      required
                      disabled={loading}
                    />
                  </div>

                  <CityAutocomplete
                    city={city}
                    country={country}
                    onCityChange={setCity}
                    onCountryChange={setCountry}
                    disabled={loading}
                    t={t}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        type={showPassword ? "text" : "password"}
                        data-testid="input-signup-password"
                        placeholder="••••••••"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <PasswordStrength password={signupPassword} t={t} />
                  </div>

                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="privacy-accept"
                      checked={privacyAccepted}
                      onChange={(e) => setPrivacyAccepted(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      data-testid="checkbox-privacy"
                      disabled={loading}
                    />
                    <label htmlFor="privacy-accept" className="text-sm text-muted-foreground cursor-pointer leading-snug">
                      {t("auth.accept_terms")}{" "}
                      <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium"
                        data-testid="link-terms-signup"
                      >
                        {t("auth.terms_of_service")}
                      </a>{" "}
                      {t("auth.and_the")}{" "}
                      <a
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium"
                        data-testid="link-privacy-policy"
                      >
                        {t("auth.privacy_policy")}
                      </a>
                    </label>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading || !privacyAccepted} data-testid="button-signup">
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {t("auth.create_account_btn")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
