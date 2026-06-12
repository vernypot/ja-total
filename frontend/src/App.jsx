import LanguageProvider from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import { IglesiaProvider } from "./context/IglesiaContext";
import { ClubProvider } from "./context/ClubContext";
import AppRouter from "./routes/AppRouter";
import ConfigRequired from "./components/ConfigRequired";

const missingEnv = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_KEY;

export default function App() {
  return (
    <LanguageProvider>
      {missingEnv ? (
        <ConfigRequired />
      ) : (
        <AuthProvider>
          <IglesiaProvider>
            <ClubProvider>
              <AppRouter />
            </ClubProvider>
          </IglesiaProvider>
        </AuthProvider>
      )}
    </LanguageProvider>
  );
}
