import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PriceDetail } from '@/components/subscriptions/price-detail';

export default function PriceDetailPage({ params }: { params: { id: string } }) {
    return (
        <div className="bg-background">
            <div className="container mx-auto px-4 py-8 space-y-6">
                <Breadcrumb
                    items={[
                        { label: 'Subscriptions', href: '/subscriptions' },
                        { label: 'Price Details', href: `/subscriptions/prices/${params.id}` },
                    ]}
                />
                <PriceDetail priceId={params.id} />
            </div>
        </div>
    );
}
