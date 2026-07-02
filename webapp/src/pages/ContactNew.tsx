import { useNavigate } from "react-router-dom";
import { addContact } from "../data";
import { cardCls } from "../ui";
import PageTitle from "../components/PageTitle";
import { UsersIcon } from "../components/icons";
import ContactForm from "./ContactForm";

export default function ContactNew() {
  const navigate = useNavigate();

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
          onSubmit={async (values) => {
            const id = await addContact(values);
            navigate(`/kisiler/${id}`);
          }}
        />
      </div>
    </div>
  );
}
