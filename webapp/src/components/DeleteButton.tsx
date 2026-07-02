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
      className="rounded-full border border-red-200 dark:border-red-500/40 px-3.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
    >
      {label}
    </button>
  );
}
