import dunesDark from '@/assets/dunes-login-dark.png';
import dunesLight from '@/assets/dunes-login-light.png';

export function Dunes() {
    return (
        <div className="hidden w-full lg:block md:block m-6">
            <img
                className="w-full h-full object-cover rounded-xl hidden dark:flex"
                src={dunesDark}
                alt="Onlook dunes dark"
            />
            <img
                className="w-full h-full object-cover rounded-xl flex dark:hidden"
                src={dunesLight}
                alt="Onlook dunes light"
            />
        </div>
    );
}
