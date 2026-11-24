import { useCallback, useState } from 'react';

interface ContactRecord {
  name?: string[];
  tel?: string[];
}

interface ContactsManagerLike {
  select: (
    properties: Array<'name' | 'tel'>,
    options?: { multiple?: boolean }
  ) => Promise<ContactRecord[]>;
}

export interface PickedContactResult {
  name: string;
  tel: string;
}

export const CONTACT_UNSUPPORTED_MESSAGE =
  'Contact selection is not supported in this browser. Please enter details manually.';

function getContactsManager(): ContactsManagerLike | null {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return null;
  }
  const nav = navigator as Navigator & { contacts?: ContactsManagerLike };
  if (nav.contacts && typeof nav.contacts.select === 'function') {
    return nav.contacts;
  }
  return null;
}

export function useContactPicker() {
  const [isSupported] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.isSecureContext && getContactsManager() !== null;
  });
  const [isPicking, setIsPicking] = useState(false);
  const [contactNotice, setContactNotice] = useState<string | null>(null);
  const [contactStatusType, setContactStatusType] = useState<'info' | 'warning' | null>(null);

  const clearContactNotice = useCallback(() => {
    setContactNotice(null);
    setContactStatusType(null);
  }, []);

  const pickContact = useCallback(async (): Promise<PickedContactResult | null> => {
    if (isPicking) return null;

    const contactsManager = getContactsManager();
    if (!contactsManager || (typeof window !== 'undefined' && !window.isSecureContext)) {
      setContactNotice(CONTACT_UNSUPPORTED_MESSAGE);
      setContactStatusType('warning');
      return null;
    }

    setIsPicking(true);
    setContactNotice(null);
    setContactStatusType(null);

    try {
      const selectedList = await contactsManager.select(['name', 'tel'], {
        multiple: false,
      });

      // User cancelled or closed the picker without selecting a contact
      if (!Array.isArray(selectedList) || selectedList.length === 0) {
        return null;
      }

      const contact = selectedList[0];
      const pickedName = Array.isArray(contact?.name)
        ? contact.name.find((item) => typeof item === 'string' && item.trim().length > 0)?.trim() ??
          ''
        : '';
      const pickedTel = Array.isArray(contact?.tel)
        ? contact.tel.find((item) => typeof item === 'string' && item.trim().length > 0)?.trim() ??
          ''
        : '';

      if (!pickedName && !pickedTel) {
        setContactNotice('चुने गए संपर्क में नाम या फोन नंबर नहीं मिला। कृपया हाथ से भरें।');
        setContactStatusType('warning');
        return null;
      }

      setContactNotice('संपर्क से किसान का नाम और फोन नंबर भर दिया गया है। आप चाहें तो बदल सकते हैं।');
      setContactStatusType('info');

      return {
        name: pickedName,
        tel: pickedTel,
      };
    } catch (err) {
      const errorName = err instanceof Error ? err.name : '';

      // AbortError means the user cancelled the picker — keep existing values untouched
      if (errorName === 'AbortError') {
        return null;
      }

      if (errorName === 'SecurityError' || errorName === 'NotSupportedError') {
        setContactNotice(CONTACT_UNSUPPORTED_MESSAGE);
        setContactStatusType('warning');
        return null;
      }

      setContactNotice('संपर्क चुनने में समस्या आई। कृपया विवरण हाथ से लिखें।');
      setContactStatusType('warning');
      return null;
    } finally {
      setIsPicking(false);
    }
  }, [isPicking]);

  return {
    isContactPickerSupported: isSupported,
    isPickingContact: isPicking,
    contactNotice,
    contactStatusType,
    pickContact,
    clearContactNotice,
  };
}
