import { useNavigate } from "react-router-dom";
import { mutate, now, uid } from "../store";
import { cardCls } from "../ui";
import LandOwnerForm from "./LandOwnerForm";

export default function LandOwnerNew() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Yeni Arsa Sahibi
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Arsa sahibi ve vekaletname bilgilerini girin.
        </p>
      </div>
      <div className={`${cardCls} p-6`}>
        <LandOwnerForm
          submitLabel="Arsa Sahibini Kaydet"
          onSubmit={(values) => {
            const id = uid();
            mutate((db) => {
              db.landOwners.push({ id, createdAt: now(), ...values });
            });
            navigate(`/arsa-sahipleri/${id}`);
          }}
        />
      </div>
    </div>
  );
}
