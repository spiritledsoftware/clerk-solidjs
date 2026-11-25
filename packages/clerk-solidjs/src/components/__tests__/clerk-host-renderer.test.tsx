import { cleanup, render } from '@solidjs/testing-library';
import { createSignal, flush } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClerkHostRenderer } from '../clerk-host-renderer';

const settle = async () => {
  flush();
  await Promise.resolve();
  flush();
};

afterEach(() => {
  cleanup();
});

describe('<ClerkHostRenderer />', () => {
  it('mounts into its root after the first render and unmounts on dispose', async () => {
    const mount = vi.fn();
    const unmount = vi.fn();
    const updateProps = vi.fn();

    const { container, unmount: dispose } = render(() => (
      <ClerkHostRenderer
        component="SignIn"
        mount={mount}
        unmount={unmount}
        updateProps={updateProps}
        props={{ path: '/sign-in' }}
      />
    ));
    await settle();

    const root = container.querySelector('[data-clerk-component="SignIn"]');
    expect(root).toBeInstanceOf(HTMLDivElement);
    expect(mount).toHaveBeenCalledWith(root, { path: '/sign-in' });

    dispose();
    expect(unmount).toHaveBeenCalledWith(root);
  });

  it('does not call updateProps when the props do not change', async () => {
    const mount = vi.fn();
    const updateProps = vi.fn();
    const [tick, setTick] = createSignal(0);

    render(() => (
      <ClerkHostRenderer
        component="UserProfile"
        mount={mount}
        unmount={vi.fn()}
        updateProps={updateProps}
        props={(tick(), { path: '/profile' })}
      />
    ));
    await settle();

    setTick(1);
    await settle();

    expect(updateProps).not.toHaveBeenCalled();
  });

  it('updates mounted component props when custom pages are added or removed', async () => {
    const mount = vi.fn();
    const updateProps = vi.fn();
    const [pages, setPages] = createSignal<{ label: string }[]>([
      { label: 'General' }
    ]);

    render(() => (
      <ClerkHostRenderer
        mount={mount}
        unmount={vi.fn()}
        updateProps={updateProps}
        props={{ customPages: pages() }}
      />
    ));
    await settle();

    setPages([{ label: 'General' }, { label: 'Permissions' }]);
    await settle();

    expect(updateProps).toHaveBeenCalledTimes(1);
    expect(updateProps).toHaveBeenCalledWith({
      node: expect.any(HTMLDivElement),
      props: { customPages: [{ label: 'General' }, { label: 'Permissions' }] }
    });
  });

  it('opens and closes modal components', async () => {
    const open = vi.fn();
    const close = vi.fn();
    const { container, unmount: dispose } = render(() => (
      <ClerkHostRenderer
        component="GoogleOneTap"
        open={open}
        close={close}
        props={{ cancelOnTapOutside: true }}
      />
    ));
    await settle();
    expect(open).toHaveBeenCalledWith({ cancelOnTapOutside: true });
    expect(container.querySelector('[data-clerk-component]')).not.toBeNull();

    dispose();
    expect(close).toHaveBeenCalled();
  });
});
