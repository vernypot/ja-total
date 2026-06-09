import { useEffect, useState } from "react";
import { getMiembros } from "../services/miembros.service";

export default function Miembros() {
  const [data, setData] = useState([]);

  useEffect(() => {
    getMiembros().then(setData);
  }, []);

  return (
    <div>
      <h2>Miembros</h2>
      {data.map(m => (
        <div key={m.id}>{m.nombre}</div>
      ))}
    </div>
  );
}
