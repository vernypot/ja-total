import { Link, useSearchParams } from "react-router-dom";

export default function Breadcrumb() {
  const [params] = useSearchParams();

  const iglesiaId = params.get("iglesia");
  const clubId = params.get("club");

  return (
    <div style={{ marginBottom: "10px" }}>
      <Link to="/dashboard/iglesias">Iglesias</Link>

      {iglesiaId && (
        <>
          {" > "}
          <Link to={`/dashboard/clubes?iglesia=${iglesiaId}`}>
            Clubes
          </Link>
        </>
      )}

      {clubId && (
        <>
          {" > "}
          <Link to={`/dashboard/miembros?club=${clubId}`}>
            Miembros
          </Link>
        </>
      )}
    </div>
  );
}
``