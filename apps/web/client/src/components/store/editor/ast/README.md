# How the AST algorithm works?

The AST manager allows us to map for component usages using a combination of the DOM tree and the AST tree we build using the index step. 
It works on the limitation that the DOM tree only has partial information and the AST has overlapping partial information. The DOM tree does not have instance information and the AST does not have the tree information. 

For example, We have a component called Child and a component called Parent:

```jsx
export function Child () {
    return <div data-oid="child">Hi I'm Child</div>
}

```

```jsx 
import { Child } from './child.jsx'

export function Parent () {
    return (
        <div data-oid="parent">
            <Child data-oid="instance"/>
        </div>
    )
}
```

On the DOM tree, we'd actually get this. Notice that the `data-oid="instance"` is missing:

```html
<div data-oid="parent">
    <div data-oid="child">
        Hi I'm Child
    </div>
</div>
```

But what if we want to find where the child instance is used using the DOM, how can we do that given we have access to the code as files and the `data-oid` map to the files?
```
- child.jsx
- parent.jsx
```
We can do that when parsing through the AST using this algorithm:
1. Parse the AST, storing the reference into a map of `data-oid` to code location and component name. The component name is either the Jsx tag name or the last function name we see.
2. Walk down the DOM tree, look at the parent of each node. If the component name differs, the node is an instance used by its parent.
3. If instance, look up the parent's code and find the child with the same index and component name. If those match, the instance location is found!


Applying the algorithm to our case we will get this:
1. Parse through the files, getting this map:

```json
{
    "parent": ["parent.jsx", "start and end location", "Parent"],
    "instance": ["parent.jsx", "start and end location", "Child"],
    "child": ["child.jsx", "start and end location", "Child"],
}
```
2. Walk through the DOM tree: 
    1. `<div data-oid="parent">` - No parent, continue
    2. `<div data-oid="child">` - Look up itself, finding the component `Child`. Look up parent, finding the component `Parent`
3. Look up the parent's code, parse its children at the index 0, finding `<Child data-oid="instance"/>`. Since this matches our index and component name, we found the instance!