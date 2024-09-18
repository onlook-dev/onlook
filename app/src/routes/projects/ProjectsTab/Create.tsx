export function CreateProject() {
    return (
        <div className="w-full flex items-center justify-center relative">
            <div className="h-full flex justify-center w-3/5 flex-col gap-32">
                <div className="w-full">
                    <p className="text-4xl text-text-active">{'Projects'}</p>
                    <p className="text-text">{"Ready to make some good lookin' app"}</p>
                </div>
                <div className="w-full flex gap-px h-2/5">
                    <div className="w-[45%] rounded-lg flex justify-center items-center h-2/5 border border-blue-500 bg-black gap-2.5">
                        <div className="w-7 h-7 bg-blue-500"></div>
                        <p className="text-blue-500">{'New React App'}</p>
                    </div>
                    <div className="w-[45%] ml-auto rounded-lg flex justify-center items-center h-2/5 gap-2.5 border border-green-500 bg-black">
                        <div className="w-7 h-7 bg-green-500"></div>
                        <p className="text-green-400">{'Import React App'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
