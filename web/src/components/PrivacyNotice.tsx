import { ShieldIcon } from "./Icons";
import { Modal, btn } from "./Modal";

export const PRIVACY_KEY = "aa.privacyNoticeAccepted";

// Aviso antes de la primera grabación. Describe exactamente lo que hace hoy el sistema.
export function PrivacyNotice({ onAccept, onCancel }: { onAccept: () => void; onCancel: () => void }) {
  return (
    <Modal
      title="Before your first recording"
      icon={<ShieldIcon />}
      onClose={onCancel}
      actions={
        <>
          <button onClick={onCancel} className={btn.secondary}>
            Cancel
          </button>
          <button data-autofocus onClick={onAccept} className={btn.primary}>
            I understand, start recording
          </button>
        </>
      }
    >
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Every few seconds the AI looks at a screenshot to describe your steps. Screenshots aren't stored. Only the description is
          saved, with names, emails, IBANs, phone numbers and IDs replaced by placeholders such as [PERSONA].
        </li>
        <li>Your conversation with the apprentice is filtered with Microsoft Presidio before it's saved.</li>
        <li>The video stays in this browser. It isn't uploaded.</li>
        <li>
          Use <strong>Off the record</strong> any time something on screen shouldn't be seen. Nothing is analyzed or saved until you
          turn it off.
        </li>
      </ul>
    </Modal>
  );
}
