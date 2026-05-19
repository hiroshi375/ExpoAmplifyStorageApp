export type Board = {
    id: string;
    name?: string | null;
    message?: string | null;
    image?: string | null;
    personID?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
};

export type BoardComponentProps = {
    board: Board;
};

export function BoardComponent({ board }: BoardComponentProps) {
    return (
        <li className="list-group-item">
            <div className="d-flex justify-content-between align-items-start">
                <div>
                    <h5 className="mb-1">{board.name ?? 'No title'}</h5>
                    <p className="mb-1">{board.message ?? 'No message'}</p>
                    {board.image ? <p className="mb-1">Image: {board.image}</p> : null}
                </div>
                <small>{board.createdAt ? new Date(board.createdAt).toLocaleDateString() : ''}</small>
            </div>
        </li>
    );
}
