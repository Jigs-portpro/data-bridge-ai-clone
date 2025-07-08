export const isAtBottom = ({ currentTarget }: { currentTarget: HTMLElement }) => {
  return !(
    currentTarget.scrollTop + 10 >=
    currentTarget.scrollHeight - currentTarget.clientHeight
  );
}; 