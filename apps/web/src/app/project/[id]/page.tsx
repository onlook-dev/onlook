export default function Page({ params }: { params: { id: string } }) {
    return <div>Project {params.id}</div>;
}