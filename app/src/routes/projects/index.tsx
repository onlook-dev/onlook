export default function Projects() {
    return (
        <div className="flex h-screen w-screen relative overflow-hidden bg-black">
            <div className="absolute top-0 w-full h-12 bg-white/10 flex justify-center items-center px-24">
                <div className="bg-sky-800 h-full w-48"> </div>
                <div className="bg-sky-600 mx-auto h-full w-48"> </div>
                <div className="bg-sky-400 h-full w-48"> </div>
            </div>
            <div className="w-3/5 h-full bg-neutral-800"> </div>
            <div className="w-2/5 h-full flex flex-col justify-center items-start p-20 bg-black gap-4">
                <p className="text-5xl text-white">Airbnb.com</p>
                <div className="flex gap-7 text-white">
                    <p>Last edited 3 days ago </p>
                    <p className="w-36"> localhost: 3000 </p>
                </div>
                <div className="flex gap-7">
                    <div className="w-44 h-12 bg-sky-100 flex justify-center items-center rounded-lg gap-2">
                        <div className="w-7 h-8 bg-black"> </div>
                        <p> Edit App </p>
                    </div>
                    <div className="w-44 h-12 flex items-center gap-2">
                        <div className="w-10 h-11 bg-sky-100"> </div>
                        <p className="text-white"> Project settings </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
