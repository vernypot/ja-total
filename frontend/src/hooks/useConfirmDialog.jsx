import { useCallback, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

const INITIAL_STATE = {
  open: false,
  title: '',
  message: '',
  highlight: '',
  confirmLabel: '',
  cancelLabel: '',
  confirming: false,
  onConfirm: null,
  onCancel: null,
};

export function useConfirmDialog(defaults = {}) {
  const [state, setState] = useState(INITIAL_STATE);

  const close = useCallback(() => {
    setState(prev => {
      if (prev.confirming) return prev;
      prev.onCancel?.();
      return INITIAL_STATE;
    });
  }, []);

  const askConfirm = useCallback((options) => {
    setState({
      ...INITIAL_STATE,
      open: true,
      title: options.title || '',
      message: options.message || '',
      highlight: options.highlight || '',
      confirmLabel: options.confirmLabel || defaults.confirmLabel || '',
      cancelLabel: options.cancelLabel || defaults.cancelLabel || '',
      onConfirm: options.onConfirm || null,
      onCancel: options.onCancel || null,
    });
  }, [defaults.cancelLabel, defaults.confirmLabel]);

  const handleConfirm = useCallback(async () => {
    const action = state.onConfirm;
    if (!action) return;

    setState(prev => ({ ...prev, confirming: true }));
    try {
      await action();
      setState(INITIAL_STATE);
    } catch {
      setState(prev => ({ ...prev, confirming: false }));
    }
  }, [state.onConfirm]);

  const confirmDialog = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      highlight={state.highlight}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      confirming={state.confirming}
      confirmingLabel={defaults.confirmingLabel}
      onConfirm={handleConfirm}
      onCancel={close}
    />
  );

  return { askConfirm, closeConfirm: close, confirmDialog };
}
