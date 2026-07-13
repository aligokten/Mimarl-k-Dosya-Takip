import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addContact } from "../data";
import { cardCls, friendlyFirestoreError } from "../ui";
import PageTitle from "../components/PageTitle";
import { UsersIcon } from "../components/icons";
import ContactForm from "./ContactForm";

export default function ContactNew() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="max-w-2xl space-y-6">
      <PageTitle
        icon={<UsersIcon className="h-5 w-5" />}
        title="Yeni Kişi"
        subtitle="Kişi bilgilerini girin ve rollerini seçin."
      />
      <div className={`${cardCls} p-6`}>
        <ContactForm
          submitLabel="Kişiyi Kaydet"
          saving={saving}
          error={error}
          onSubmit={async (values) => {
            setSaving(true);
            setError(null);
            try {
              const id = await addContact(values);
              navigate(`/kisiler/${id}`);
            } catch (err) {
              setError(friendlyFirestoreError(err, "Kişi kaydedilemedi"));
              setSaving(false);
            }
          }}
        />
      </div>
    </div>
  );
}
