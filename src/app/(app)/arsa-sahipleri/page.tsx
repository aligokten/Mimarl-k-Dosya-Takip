import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default async function ArsaSahipleriPage() {
  const landOwners = await prisma.landOwner.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { projects: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Arsa Sahipleri
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Vekaletname alınan arsa sahipleri.
          </p>
        </div>
        <Link
          href="/arsa-sahipleri/yeni"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Yeni Arsa Sahibi
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Ad Soyad
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Telefon
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Vekaletname No
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Vekaletname Tarihi
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Proje Sayısı
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {landOwners.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-sm text-slate-500"
                >
                  Henüz arsa sahibi eklenmemiş.
                </td>
              </tr>
            )}
            {landOwners.map((owner) => (
              <tr key={owner.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-medium text-slate-900">
                  <Link
                    href={`/arsa-sahipleri/${owner.id}`}
                    className="hover:underline"
                  >
                    {owner.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {owner.phone || "-"}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {owner.powerOfAttorneyNo || "-"}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {owner.powerOfAttorneyDate
                    ? format(owner.powerOfAttorneyDate, "d MMMM yyyy", {
                        locale: tr,
                      })
                    : "-"}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {owner._count.projects}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
