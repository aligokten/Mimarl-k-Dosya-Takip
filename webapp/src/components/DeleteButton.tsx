export default function DeleteButton({
  onDelete,
  confirmMessage,
  label = "Sil",
}: {
  onDelete: () => void;
  confirmMessage: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (window.confirm(confirmMessage)) onDelete();
      }}
      className="rounded-full border border-red-200 px-3.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
    >
      {label}
    </button>
  );
}
