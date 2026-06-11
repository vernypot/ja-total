import { AuthProvider } from "./context/AuthContext";
import LanguageProvider from "./context/LanguageContext";
import { IglesiaProvider } from "./context/IglesiaContext";
import AppRouter from "./routes/AppRouter";

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <IglesiaProvider>
          <AppRouter />
        </IglesiaProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
