import { Meta, Title } from "@solidjs/meta"
import Gridview from "#src/components/marketplace/Gridview.jsx"
import MarketplaceLayout from "#src/components/marketplace/MarketplaceLayout.jsx"

export function Page() {
	return (
		<>
			<Title>Global Website</Title>
			<Meta name="description" content="Let your website speak the language of your customers." />
			<Meta name="og:image" content="/images/inlang-marketplace-image.jpg" />
			<MarketplaceLayout>
				<div class="pb-16 md:pb-20 min-h-screen relative">
					<h2 class="text-md text-surface-600 pb-4 pt-8">All Products</h2>
					<Gridview />
				</div>
			</MarketplaceLayout>
		</>
	)
}