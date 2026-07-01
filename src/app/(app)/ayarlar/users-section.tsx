import { createUser, deleteUser } from "@/lib/actions/users";
import DeleteButton from "@/components/delete-button";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
};

export default function UsersSection({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-slate-900">Kullanıcılar</h2>
      <p className="mt-1 text-sm text-slate-500">
        Ofis çalışanlarının sisteme giriş hesapları.
      </p>

      <ul className="mt-4 divide-y divide-slate-100">
        {users.map((user) => (
          <li
            key={user.id}
            className="flex items-center justify-between py-3"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">
                {user.name}{" "}
                <span className="font-normal text-slate-400">
                  ({user.role === "ADMIN" ? "Yönetici" : "Personel"})
                </span>
              </p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            {user.id !== currentUserId && (
              <DeleteButton
                action={deleteUser.bind(null, user.id)}
                confirmMessage={`"${user.name}" kullanıcısını silmek istediğinize emin misiniz?`}
              />
            )}
          </li>
        ))}
      </ul>

      <form
        action={createUser}
        className="mt-5 space-y-3 border-t border-slate-100 pt-4"
      >
        <p className="text-sm font-medium text-slate-700">
          Yeni Kullanıcı Ekle
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            name="name"
            required
            placeholder="Ad Soyad"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="E-posta"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Geçici Şifre"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          <select
            name="role"
            defaultValue="STAFF"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="STAFF">Personel</option>
            <option value="ADMIN">Yönetici</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Kullanıcı Ekle
        </button>
      </form>
    </section>
  );
}
