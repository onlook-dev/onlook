- This is a Bun workspace, only use bun, not npm
- Unit tests can be run with `bun test`
- Run type checking with `bun run typecheck`
- Apply database updates to local dev with `bun run db:push`

## MobX + React Best Practices

### Pattern for Provider Components with Observable Stores
When creating React providers that manage MobX observable stores (like EditorEngine):

**✅ DO:**
- Use `useState(() => new Store())` for stable observable instances (MobX recommended pattern)
- Keep refs (`engineRef.current`) to avoid stale closures in effects
- Use `setTimeout(() => store.clear(), 0)` for delayed cleanup to avoid race conditions
- Separate project changes from branch updates with proper dependency arrays

**❌ DON'T:**
- Use `useMemo` for observable references - React may randomly "forget" them (data loss risk)
- Clean up stores synchronously during navigation - causes "No branch selected" errors
- Include the store instance in effect dependency arrays if it causes infinite loops

### Example Pattern:
```tsx
const [store, setStore] = useState(() => new Store(props));
const storeRef = useRef<Store | null>(store);

useEffect(() => {
  if (propChanged) {
    setTimeout(() => storeRef.current?.clear(), 0); // Delayed cleanup
    const newStore = new Store(newProps);
    storeRef.current = newStore;
    setStore(newStore);
  }
}, [propChanged]);

useEffect(() => {
  return () => setTimeout(() => storeRef.current?.clear(), 0);
}, []);
```

This maintains MobX reactivity while preventing cleanup race conditions.
