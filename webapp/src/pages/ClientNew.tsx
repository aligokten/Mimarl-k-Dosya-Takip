import { useNavigate } from "react-router-dom";
import { mutate, now, uid } from "../store";
import { cardCls } from "../ui";
import ClientForm from "./ClientForm";

export default function ClientNew() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Yeni Müşteri</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Müşteri bilgilerini girin.
        </p>
      </div>
      <div className={`${cardCls} p-6`}>
        <ClientForm
          submitLabel="Müşteriyi Kaydet"
          onSubmit={(values) => {
            const id = uid();
            mutate((db) => {
              db.clients.push({ id, createdAt: now(), ...values });
            });
            navigate(`/musteriler/${id}`);
          }}
        />
      </div>
    </div>
  );
}
