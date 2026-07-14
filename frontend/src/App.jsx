import LanguageProvider from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { PageHelpProvider } from "./context/PageHelpContext";
import { IglesiaProvider } from "./context/IglesiaContext";
import { ClubProvider } from "./context/ClubContext";
import AppRouter from "./routes/AppRouter";
import ConfigRequired from "./components/ConfigRequired";
import { MemberPortalProvider } from "./context/MemberPortalContext";

const missingEnv = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_KEY;

export default function App() {
  return (
    <LanguageProvider>
      {missingEnv ? (
        <ConfigRequired />
      ) : (
        <AuthProvider>
          <MemberPortalProvider>
            <ThemeProvider>
              <PageHelpProvider>
                <IglesiaProvider>
                  <ClubProvider>
                    <AppRouter />
                  </ClubProvider>
                </IglesiaProvider>
              </PageHelpProvider>
            </ThemeProvider>
          </MemberPortalProvider>
        </AuthProvider>
      )}
    </LanguageProvider>
  );
}
