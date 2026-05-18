import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Favoritos - Conta VELKOR'
};

export default function AccountWishlistPage() {
  redirect('/wishlist');
}
