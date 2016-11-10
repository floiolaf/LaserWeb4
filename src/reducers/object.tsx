// TODO: need a better name than 'object'. Some name that's pretty general.

interface ObjectWithId {
    id: string,
};

interface ObjectWithChildren {
    id: string,
    children: string[],
};

// Actions:
//      add:        returns a new object with attrs set
//      addChild:   returns a new object with attrs set
//      setAttrs:   sets attrs, but only if action.payload.id === state.id
export function object<T extends ObjectWithId>(objectType: string, initialState: T) {
    let add = objectType.toUpperCase() + '_ADD';
    let addChild = objectType.toUpperCase() + '_ADD_CHILD';
    let setAttrs = objectType.toUpperCase() + '_SET_ATTRS';
    return (state: T, action: any): T => {
        if (action.type === add || action.type === addChild)
            return Object.assign({}, initialState, action.payload.attrs);
        else if (action.type === setAttrs && action.payload.id === state.id)
            return Object.assign({}, state, action.payload.attrs);
        else
            return state;
    };
};

// Actions:
//      add:        returns a new object with attrs set
//      addChild:   returns a new object with attrs set
//      setAttrs:   sets attrs, ignores id
export function objectNoId<T>(objectType: string, initialState: T) {
    let add = objectType.toUpperCase() + '_ADD';
    let addChild = objectType.toUpperCase() + '_ADD_CHILD';
    let setAttrs = objectType.toUpperCase() + '_SET_ATTRS';
    return (state = initialState, action: any): T => {
        if (action.type === add || action.type === addChild)
            return Object.assign({}, initialState, action.payload.attrs);
        else if (action.type === setAttrs)
            return Object.assign({}, state, action.payload.attrs);
        else
            return state;
    };
};

// Actions:
//      add:        adds a new object to array and sets attrs
//      remove:     removes object from array
// baseReducer should be object(objectType, ...)
export function objectArray<T extends ObjectWithId>(objectType: string, baseReducer: (action: any, o: T) => T) {
    let add = objectType.toUpperCase() + '_ADD';
    let remove = objectType.toUpperCase() + '_REMOVE';
    return (state: T[] = [], action: any): T[] => {
        switch (action.type) {
            case add:
                return [...state, baseReducer(undefined, action)];
            case remove:
                return state.filter(o => o.id !== action.payload);
            default:
                return state.map(o => baseReducer(o, action));
        }
    };
};

// A forest (a tree with multiple roots) looks like this.
// [
//     {
//         id: 'uuid-for-root-1',
//         children: ['uuid-for-child', ...],
//         more attrs...
//     },
//     {
//         id: 'uuid-for-child',
//         children: ['uuid-for-grandchild', ...],
//         more attrs...
//     },
//     {
//         id: 'uuid-for-grandchild',
//         children: [...],
//         more attrs...
//     },
// ]

// Actions:
//      add:        adds a new object to array and sets attrs. Use this to add roots.
//      addChild:   adds a new object to array and sets attrs. Also adds it to parent.
//      remove:     removes object from array. Also removes it from any parents.
// objectReducer should be object(objectType, ...)
export function forest<T extends ObjectWithChildren>(
    objectType: string, objectReducer: (action: any, o: T) => T
) {
    let add = objectType.toUpperCase() + '_ADD';
    let addChild = objectType.toUpperCase() + '_ADD_CHILD';
    let remove = objectType.toUpperCase() + '_REMOVE';
    return (state: T[] = [], action: any) => {
        switch (action.type) {
            case add:
                return [...state, objectReducer(undefined, action)];
            case addChild:
                return [
                    ...state.map(o => {
                        if (o.id === action.payload.parentId)
                            return Object.assign(
                                {}, o, { children: [...o.children, action.payload.attrs.id] });
                        else
                            return o;
                    }),
                    objectReducer(undefined, action)
                ];
            case remove:
                let ids = getSubtreeIds(state, action.payload);
                return state.filter(o => !ids.includes(o.id))
                    .map(parent => Object.assign({}, parent, {
                        children: parent.children.filter(childId => childId !== action.payload)
                    }));
            default:
                return state.map(o => objectReducer(o, action));
        }
    };
};

export function getSubtreeIds<T extends ObjectWithChildren>(forest: T[], rootId: string) {
    let ids = [rootId];
    for (let i = 0; i < ids.length; ++i) {
        let o = forest.find(o => o.id === ids[i]);
        if (o)
            for (let id of o.children)
                ids.push(id);
    }
    return ids;
}

export function reduceSubtree<T extends ObjectWithChildren>(
    forest: T[], rootId: string, includeRoot: boolean, reduce: (o: T) => T
) {
    let ids = getSubtreeIds(forest, rootId);
    return forest.map(o => {
        if ((includeRoot || o.id !== rootId) && ids.includes(o.id))
            return reduce(o);
        else
            return o;
    })
}

export function getParentIds<T extends ObjectWithChildren>(forest: T[], childId: string) {
    let ids = [childId];
    for (let i = 0; i < ids.length; ++i) {
        let o = forest.find(o => o.children.includes(ids[i]));
        if (o)
            ids.push(o.id);
    }
    return ids;
}

export function reduceParents<T extends ObjectWithChildren>(
    forest: T[], rootId: string, includeRoot: boolean, reduce: (o: T) => T
) {
    let ids = getParentIds(forest, rootId);
    return forest.map(o => {
        if ((includeRoot || o.id !== rootId) && ids.includes(o.id))
            return reduce(o);
        else
            return o;
    })
}
